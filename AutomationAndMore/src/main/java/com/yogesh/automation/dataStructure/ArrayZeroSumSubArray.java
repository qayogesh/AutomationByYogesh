package com.yogesh.automation.dataStructure;

public class ArrayZeroSumSubArray {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		ArrayZeroSumSubArray obj = new ArrayZeroSumSubArray();
		int[] arr = { 1, 2, 3, 4, -10, 5 };
		System.out.println("end index is " + obj.zeroSumSubArray(arr));
	}

	public int zeroSumSubArray(int[] arr) {
		int len = arr.length;
		// get first elements
		// sum to next element and check sum is zero?
		// No..continue
		// break; get i start and end - sub-array
		int i;
		int temp = arr[0];
		for (i = 1; i < len; i++) {
			temp += arr[i];
			if (temp == 0) {
				System.out.println("sum is zero " + temp);
				break;
			} else {
				System.out.println("sum is not zero " + temp);
			}
		}

		if (temp == 0) {
			return i;
		} else {
			return 0;
		}

	}

}
