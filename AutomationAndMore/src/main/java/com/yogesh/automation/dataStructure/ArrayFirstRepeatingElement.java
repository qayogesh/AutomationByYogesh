package com.yogesh.automation.dataStructure;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;

public class ArrayFirstRepeatingElement {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		ArrayFirstRepeatingElement obj = new ArrayFirstRepeatingElement();
		int[] arr = { 11, 33, 55, 66, 66, 88, 9, 9 };
		obj.firstRepeatingElement(arr);
	}

	public void firstRepeatingElement(int[] arr) {
		int len = arr.length;
		//Arrays.sort(arr);

		HashSet set = new HashSet<>();
		for (int i = 0; i < len; i++) {
			if (set.add(arr[i]) == false) {
				System.out.print("First Repeatitive element is " + arr[i]);
				break;
			}
		}
	}

}
