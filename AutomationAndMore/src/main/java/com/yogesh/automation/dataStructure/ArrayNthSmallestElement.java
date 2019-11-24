package com.yogesh.automation.dataStructure;

import java.util.ArrayList;
import java.util.Arrays;

public class ArrayNthSmallestElement {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		ArrayNthSmallestElement obj = new ArrayNthSmallestElement();
		int[] arr = { 10, 20, 50, 90, 100, 40, 30, 70, 60, 80 };
		System.out.println(obj.getNthNumber(arr, 8));
	}

	public int getNthNumber(int[] arr, int n) {
		Arrays.sort(arr);
		return arr[n - 1];
	}

}
